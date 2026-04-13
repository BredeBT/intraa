import { Html, Head, Body, Container, Heading, Text, Button, Hr } from "@react-email/components";

export function PasswordResetEmail({ name, resetUrl }: { name: string; resetUrl: string }) {
  return (
    <Html>
      <Head />
      <Body style={{ background: "#0d0d14", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", background: "#12121e", borderRadius: 12, padding: 32 }}>
          <Heading style={{ color: "#a78bfa", fontSize: 24, marginBottom: 8 }}>
            Tilbakestill passordet ditt
          </Heading>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, lineHeight: 1.6 }}>
            Hei {name}, vi mottok en forespørsel om å tilbakestille passordet ditt på Intraa.
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.38)", fontSize: 14 }}>
            Klikk på knappen under for å velge et nytt passord. Lenken er gyldig i 1 time.
          </Text>
          <Button
            href={resetUrl}
            style={{ background: "#6c47ff", color: "white", padding: "12px 24px", borderRadius: 8, fontSize: 14, fontWeight: 500, marginTop: 16, display: "inline-block" }}
          >
            Tilbakestill passord →
          </Button>
          <Hr style={{ borderColor: "rgba(255,255,255,0.08)", margin: "24px 0" }} />
          <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
            Hvis du ikke ba om dette kan du ignorere denne eposten. Passordet ditt endres ikke.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
