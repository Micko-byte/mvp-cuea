/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

const LOGO_URL = 'https://yqjorkcibfdxmuqrcpnn.supabase.co/storage/v1/object/public/email-assets/sekani-logo.png'

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Kugraduate ni must! Confirm your Sekani account 🎓</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Sekani" width="120" height="auto" style={logo} />
        <Heading style={h1}>Kugraduate ni must! 🎓</Heading>
        <Text style={text}>
          Welcome to{' '}
          <Link href={siteUrl} style={link}>
            <strong>Sekani</strong>
          </Link>
          — your personal AI study companion. Hakuna stress, we've got you covered!
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verify My Email
        </Button>

        <Hr style={divider} />

        <Heading style={h2}>🚀 Quick Start Guide</Heading>
        <Text style={guideText}>
          <strong>1. Pick your units</strong> — Select the courses you're studying this semester so the AI knows what to help with.
        </Text>
        <Text style={guideText}>
          <strong>2. Upload materials</strong> — Drop your notes, past papers, or slides. The AI learns from them to give you better answers.
        </Text>
        <Text style={guideText}>
          <strong>3. Ask anything</strong> — Type your question in the chat. The AI will reference your uploaded materials for accurate answers.
        </Text>
        <Text style={guideText}>
          <strong>4. Try "Teach Me" mode</strong> — Want to master a whole unit topic by topic? Hit the Teach Me button and let the AI tutor you step by step.
        </Text>
        <Text style={guideText}>
          <strong>5. Generate documents</strong> — Need summaries, notes, or study guides? The AI can create and export them for you.
        </Text>

        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const logo = { margin: '0 0 20px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1C2939',
  margin: '0 0 20px',
}
const h2 = {
  fontSize: '18px',
  fontWeight: 'bold' as const,
  color: '#1C2939',
  margin: '0 0 15px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const guideText = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.6',
  margin: '0 0 12px',
}
const link = { color: '#1C2939', textDecoration: 'underline' }
const button = {
  backgroundColor: '#1C2939',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const divider = { borderColor: '#e5e7eb', margin: '30px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
