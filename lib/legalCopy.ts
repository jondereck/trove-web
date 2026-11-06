export const LEGAL_UPDATED = '6 November 2026'
export const LEGAL_CONTACT = 'the Contact support row in Settings'

export type LegalSection = {
  heading: string
  paragraphs: string[]
}

export const PRIVACY_TITLE = 'Privacy policy'
export const TERMS_TITLE = 'Terms of use'

export const PRIVACY_INTRO =
  'Trove is a personal library for links, notes, images, and videos. This page says what we store, why, and how you can reach us.'

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: 'Who this covers',
    paragraphs: [
      'This policy covers the Trove phone app and Trove Web (web-trove.vercel.app). Guest use stays on your device. A free signed-in account stores your email, Google login, name, and photo so you can sign back in; the library still stays on the phone. A Trove Cloud library is stored on our servers so you can open it on another device and on the web.',
    ],
  },
  {
    heading: 'What we store',
    paragraphs: [
      'On the phone, guest and free-account saves live in on-device storage. Signing in without Trove Cloud does not upload your library. Trove Cloud stores your library (saves, collections, reminders, daily tasks, and vault metadata) in our database in Singapore, with a nightly backup copy.',
      'A free account can store a profile photo. Photos and files you add with Trove Cloud are stored in our media bucket. Older files may still be served from the backup store.',
      'We keep a sign-in session so you stay logged in. On the website that is a cookie named trove_session. The phone keeps the session in secure on-device storage. Google or email sign-in also sets cookies from our auth provider so the login can finish.',
      'If you use AI organize, we send the item title, link, and description to our AI proxy (OpenAI). Locked Trove Vault items are not sent. If you connect an agent with MCP, it can read the library you authorized.',
    ],
  },
  {
    heading: 'Trove Vault',
    paragraphs: [
      'Vault items are encrypted on your device with a passphrase you choose. We do not receive that passphrase. A lost passphrase cannot be recovered by us.',
    ],
  },
  {
    heading: 'Cookies and similar storage',
    paragraphs: [
      'The website uses a sign-in cookie that is required to keep you logged in. We do not set advertising cookies. The phone does not use a cookie banner; it stores the session and your settings on the device.',
      'Your choice to dismiss the cookie notice is saved in this browser only.',
    ],
  },
  {
    heading: 'What we do not do',
    paragraphs: [
      'We do not sell your library. We do not run ads against it. We do not use your saves to train a public model.',
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: [
      'Cloud library data stays until you delete the item or close the account. Session cookies last about 30 days of use. Nightly backups rotate with the backup job.',
    ],
  },
  {
    heading: 'Your choices',
    paragraphs: [
      'You can edit or delete saves in the app, export a local backup, sign out, or write to support and ask us to delete a Cloud account. Philippine data privacy law (the Data Privacy Act) applies to this product.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      `Questions about this policy: use ${LEGAL_CONTACT}.`,
    ],
  },
]

export const TERMS_INTRO =
  'These terms cover using the Trove phone app and Trove Web. If you do not agree, do not use the product.'

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: 'The product',
    paragraphs: [
      'Trove is a personal curation app. Guest mode stores data on your device and needs no login. A free account is optional: it keeps your sign-in, profile, AI meter, and purchases. Trove Cloud (paid) syncs your library so you can open it on the web and on another phone.',
    ],
  },
  {
    heading: 'Your account',
    paragraphs: [
      'You can stay a guest. If you connect an account, you are responsible for the email, Google login, and password you use. Keep your vault passphrase private. We may close an account that is abused or that we cannot keep safely.',
    ],
  },
  {
    heading: 'Your content',
    paragraphs: [
      'You keep the rights to what you save. You grant us permission to store and display it so the app can work. Do not save material you have no right to keep. Shared collection links show what you chose to share.',
    ],
  },
  {
    heading: 'AI and agents',
    paragraphs: [
      'Organize suggestions can be wrong. You decide whether to apply them. Connecting an agent (MCP) lets that agent read your library until you revoke it.',
    ],
  },
  {
    heading: 'Plans and availability',
    paragraphs: [
      'Free, Unlocked, and Cloud limits can change. The service may be down. We are not liable for lost local data if the device fails; keep a backup if the library matters to you.',
    ],
  },
  {
    heading: 'Contact',
    paragraphs: [
      `Questions about these terms: use ${LEGAL_CONTACT}.`,
    ],
  },
]
