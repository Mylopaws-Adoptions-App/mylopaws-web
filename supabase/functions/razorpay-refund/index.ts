import { createClient } from 'jsr:@supabase/supabase-js@2';

// Customer-initiated auto-refund when they cancel a travel booking whose pickup time an admin
// changed. Eligibility is enforced HERE (never trusted from the client): the caller must own the
// order, it must be webhook-verified paid, still pre-trip, and have pickup_changed_at set. The
// refund amount comes from the stored payments row, not the request. Idempotent: a second call
// after a refund exists is a no-op. Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (same as create-order).
Deno.serve(async (req: Request) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const body = await req.json();
    const orderType: string = body.order_type;
    const orderId: number = body.order_id;
    if (orderType !== 'travel') return json({ error: 'unsupported order type' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 1) Ownership.
    const { data: order } = await admin.from('orders')
      .select('id, customer_id, status, payment_status, pickup_changed_at')
      .eq('id', orderId).single();
    if (!order || order.customer_id !== user.id) return json({ error: 'order not found' }, 404);

    // 2) Eligibility — mirrors the client gate, but this server check is the real one.
    if (order.payment_status !== 'paid') return json({ error: 'This booking has no captured payment to refund.' }, 400);
    if (!order.pickup_changed_at) return json({ error: 'Cancellation with refund is only available after a pickup-time change.' }, 400);
    if (!['unassigned', 'assigned'].includes(order.status)) {
      return json({ error: 'This trip can no longer be cancelled for a refund.' }, 400);
    }

    // 3) The webhook-verified paid payment carries the razorpay_payment_id we refund against.
    const { data: pay } = await admin.from('payments')
      .select('id, razorpay_payment_id, amount, refund_id')
      .eq('order_type', 'travel').eq('order_id', orderId).eq('status', 'paid')
      .not('razorpay_payment_id', 'is', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!pay?.razorpay_payment_id) return json({ error: 'No captured payment found for this booking.' }, 400);

    // Idempotency: already refunded → just make sure the order reads cancelled, and return.
    if (pay.refund_id) {
      await admin.from('orders').update({
        status: 'cancelled',
        cancel_reason: 'Pickup time changed — customer cancelled (auto-refund)',
        refunded_amount: pay.amount,
      }).eq('id', orderId).neq('status', 'cancelled');
      return json({ ok: true, refund_id: pay.refund_id, amount: pay.amount, already: true });
    }

    // 4) Issue the refund (full booking fee, amount from the DB row → paise).
    const keyId = Deno.env.get('RAZORPAY_KEY_ID')!;
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;
    const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${pay.razorpay_payment_id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`) },
      body: JSON.stringify({
        amount: Math.round(Number(pay.amount) * 100),
        speed: 'optimum',
        notes: { order_type: 'travel', order_id: String(orderId), reason: 'pickup_time_changed' },
      }),
    });
    const refund = await rzpRes.json();
    if (!rzpRes.ok) return json({ error: refund?.error?.description ?? 'refund failed' }, 400);

    // 5) Record the refund + cancel the order. payment_status stays 'paid' so the order still
    //    surfaces under the board's Cancelled section; refund state lives on the payments row.
    const nowIso = new Date().toISOString();
    await admin.from('payments').update({
      refund_id: refund.id,
      refund_status: refund.status ?? 'processed',
      refunded_amount: pay.amount,
      refunded_at: nowIso,
      updated_at: nowIso,
    }).eq('id', pay.id);

    await admin.from('orders').update({
      status: 'cancelled',
      cancel_reason: 'Pickup time changed — customer cancelled (auto-refund)',
      refunded_amount: pay.amount,
    }).eq('id', orderId);

    // Best-effort push (never blocks the refund result).
    try {
      const { data: tokens } = await admin.from('push_tokens').select('expo_token').eq('user_id', user.id);
      if (tokens?.length) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tokens.map((t: { expo_token: string }) => ({
            to: t.expo_token,
            title: 'Booking cancelled — refund on the way 🐾',
            body: `₹${pay.amount} for booking #${orderId} is being refunded to your original payment method.`,
          }))),
        });
      }
    } catch { /* ignore */ }

    return json({ ok: true, refund_id: refund.id, amount: pay.amount });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 400);
  }
});
