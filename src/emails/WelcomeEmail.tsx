import { Html, Head, Body, Container, Heading, Text, Button, Hr } from "@react-email/components";

export function WelcomeEmail({ name, unsubUrl }: { name: string; unsubUrl: string }) {
  return (
    <Html>
      <Head />
      <Body style={{ background: "#0d0d14", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", background: "#12121e", borderRadius: 12, padding: 32 }}>
          <Heading style={{ color: "#a78bfa", fontSize: 24, marginBottom: 8 }}>
            Velkommen til Intraa, {name}!
          </Heading>
          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, lineHeight: 1.6 }}>
            Vi er glad for at du er med. Finn et community å bli med i, chat med andre og bli en del av fellesskapet.
          </Text>
          <Button
            href="https://intraa.net/home"
            style={{ background: "#6c47ff", color: "white", padding: "12px 24px", borderRadius: 8, fontSize: 14, fontWeight: 500, marginTop: 16, display: "inline-block" }}
          >
            Gå til Intraa →
          </Button>
          <Hr style={{ borderColor: "rgba(255,255,255,0.08)", margin: "24px 0" }} />
          <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
            Du mottar denne eposten fordi du registrerte deg på intraa.net.{" "}
            <a href={unsubUrl} style={{ color: "#6c47ff" }}>
              Meld deg av epostlisten
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
