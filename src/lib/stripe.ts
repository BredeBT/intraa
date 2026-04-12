// TODO: Stripe-integrasjon
// import Stripe from 'stripe'
// export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function createCheckoutSession(_userId: string): Promise<never> {
  // TODO: Implementer Stripe checkout
  // const session = await stripe.checkout.sessions.create({
  //   mode: 'subscription',
  //   payment_method_types: ['card'],
  //   line_items: [{ price: process.env.STRIPE_FANPASS_PRICE_ID, quantity: 1 }],
  //   success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/community/lojalitet?success=1`,
  //   cancel_url:  `${process.env.NEXT_PUBLIC_BASE_URL}/community/lojalitet`,
  //   metadata: { userId },
  // })
  // return session.url!
  throw new Error("Stripe ikke konfigurert ennå");
}

export async function handleWebhook(_event: unknown): Promise<void> {
  // TODO: Håndter Stripe webhooks
  // const e = _event as Stripe.Event
  // switch (e.type) {
  //   case 'checkout.session.completed': {
  //     const session = e.data.object as Stripe.Checkout.Session
  //     const userId = session.metadata?.userId
  //     if (userId) await aktiverFanpass(userId)
  //     break
  //   }
  //   case 'customer.subscription.deleted': {
  //     // deaktiver Fanpass
  //     break
  //   }
  // }
}
