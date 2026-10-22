# Renewly: subscription tracker

An iPhone app (built with Expo / React Native) that tracks every subscription you pay for, shows your real monthly and yearly cost, and reminds you before each renewal so you can cancel in time.

**Free:** up to 5 subscriptions, renewal reminders.
**Pro (in-app purchase):** unlimited subscriptions and spending-by-category insights.

There's no account, no server, no ads and no tracking. Data stays on the device, so there's nothing to host and App Review has little to object to.

## Project layout

| Path | What it is |
| --- | --- |
| `src/app/` | Screens (Expo Router): home, add/edit, paywall, settings |
| `src/lib/billing.ts` | Renewal-date math and cost normalisation (unit tested) |
| `src/lib/notifications.ts` | Schedules local renewal reminders |
| `src/lib/purchases.ts` | In-app purchases through RevenueCat |
| `src/lib/config.ts` | Privacy policy, terms and support links. **Edit before submitting.** |
| `src/state/AppState.tsx` | App state, saved to the device |

## Run it

```bash
npm install
npm test            # unit tests
npm run typecheck
npm run lint
npx expo start      # then press "w" for a browser preview
```

Purchases and the native date picker need a **development build**, not Expo Go:
`npx eas-cli@latest build --profile development --platform ios`.
In development builds without a RevenueCat key, the paywall has an "Unlock Pro (development only)" button for testing. It never appears in release builds.

## Getting it on the App Store

No Mac needed. EAS builds and submits in the cloud.

1. **Join the Apple Developer Program** ($99/year): https://developer.apple.com/programs/
2. **Pick a unique name and bundle ID.** App Store names must be unique, so check that "Renewly" is free in App Store Connect (otherwise try something like "Renewly: Subscription Tracker"). Replace `com.example.renewly` in `app.json` with your own, e.g. `com.yourname.renewly`.
3. **Create the app in App Store Connect** (My Apps → +) using that bundle ID.
4. **Create the in-app purchase** in App Store Connect → your app → Monetization. Recommended: a **non-consumable** "Renewly Pro Lifetime" (for example $4.99–$9.99). "Pay once, no subscription" sells well for a subscription tracker. You can add a yearly subscription too.
5. **Set up RevenueCat** (free until you earn $2.5k/month): https://app.revenuecat.com
   - Add your iOS app and connect App Store Connect (in-app purchase key).
   - Create an **entitlement** with identifier `pro`.
   - Create an **offering** marked *current*, add your product(s) as packages (use the *Lifetime* package type for the lifetime unlock).
   - Copy the public iOS SDK key into `.env.local` (see `.env.example`), and add it as an EAS environment variable so cloud builds get it:
     `npx eas-cli@latest env:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_xxx --environment production`
6. **Publish a privacy policy** (a free GitHub Pages or Notion page works) and put the URL in `src/lib/config.ts` along with your support email. Under App Privacy in App Store Connect you can answer **"Data Not Collected"**.
7. **Build and submit:**
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init                 # links the project to your Expo account
   npx eas-cli@latest build --platform ios --profile production
   npx eas-cli@latest submit --platform ios --latest
   ```
   EAS will offer to create the signing certificates for you; say yes.
8. **Test with TestFlight**, including a sandbox purchase and "Restore purchases".
9. **Fill in the listing.** You need screenshots (6.9" iPhone), a description, keywords and a support URL. Attach the in-app purchase to the version, then submit for review.

### Listing copy to start from

- **Subtitle:** Track & cancel subscriptions
- **Keywords:** subscription,tracker,bills,budget,renewal,reminder,cancel,spending,money,recurring
- **Description:** *Stop paying for subscriptions you forgot about. Renewly shows exactly how much your subscriptions cost each month and year, and reminds you before every renewal so you can cancel in time. No account, no ads, and your data never leaves your phone.*

## Ideas for later versions

- Home-screen widget showing the next renewal
- iCloud sync and backup
- Free-trial tracking ("trial ends in 2 days")
- CSV export
