import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — To Go" },
      { name: "description", content: "Como o To Go coleta e usa seus dados." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <Layout title="Política de Privacidade" updated="23 de abril de 2026">
      <p>
        Esta Política de Privacidade descreve como <strong>John Charles Long</strong>
        {" "}(operando o produto <strong>To Go</strong>; doravante "nós", "nosso" ou
        "controlador") coleta, usa, compartilha e protege os dados pessoais dos
        usuários do serviço, em conformidade com a LGPD (Lei 13.709/2018) e demais
        legislações aplicáveis.
      </p>

      <h2>1. Identificação do controlador</h2>
      <p>
        O controlador dos dados é <strong>John Charles Long</strong>, pessoa
        responsável pela operação do produto To Go. Para qualquer assunto
        relacionado a esta política ou ao tratamento dos seus dados, escreva para
        o e-mail de suporte indicado no final deste documento.
      </p>

      <h2>2. Categorias de dados pessoais coletados</h2>
      <p>
        <strong>Dados de cadastro</strong>: e-mail, senha (armazenada de forma
        criptografada com hash), nome de usuário e display name (quando fornecido).<br />
        <strong>Dados de perfil público</strong>: bio, cidade, foto e visibilidade
        do perfil, conforme você configurar.<br />
        <strong>Dados de uso</strong>: restaurantes, listas, notas, fotos, tags,
        avaliações e atividades dentro do app.<br />
        <strong>Dados técnicos</strong>: endereço IP, identificador de dispositivo,
        logs de acesso e telemetria mínima necessária para segurança e operação.<br />
        <strong>Dados de pagamento</strong>: tratados exclusivamente pela Stripe.
        Nós não armazenamos número de cartão.
      </p>

      <h2>3. Finalidades e bases legais do tratamento</h2>
      <p>
        Tratamos seus dados com as seguintes finalidades e bases legais (LGPD,
        art. 7º):
      </p>
      <p>
        <strong>Criação e manutenção da conta</strong> (e-mail, senha): execução
        de contrato.<br />
        <strong>Fornecimento das funcionalidades do app</strong> (listas,
        restaurantes, notas): execução de contrato.<br />
        <strong>Processamento da assinatura Pro e cobrança</strong>: execução de
        contrato e cumprimento de obrigação legal/regulatória (fiscal).<br />
        <strong>Comunicações operacionais</strong> (recibos, alertas de cobrança,
        avisos de segurança): execução de contrato e legítimo interesse.<br />
        <strong>Prevenção a fraude e segurança da plataforma</strong>: legítimo
        interesse.<br />
        <strong>Melhoria do produto e métricas agregadas</strong>: legítimo
        interesse, sem identificação individual.<br />
        <strong>Comunicações de marketing</strong> (quando aplicável): consentimento,
        revogável a qualquer momento.
      </p>

      <h2>4. Compartilhamento e subprocessadores</h2>
      <p>
        Não vendemos seus dados pessoais. Compartilhamos com as seguintes
        categorias de destinatários, estritamente para as finalidades acima:
      </p>
      <p>
        <strong>Provedores de infraestrutura</strong>: Supabase (hospedagem do
        banco de dados, autenticação e storage).<br />
        <strong>Provedor de pagamentos</strong>: Stripe, responsável pelo
        processamento de pagamentos, faturas e gestão da assinatura.<br />
        <strong>Provedor de e-mail transacional</strong>: para envio de
        confirmações, recuperação de senha e avisos.<br />
        <strong>Assessores profissionais</strong> (jurídico, contábil), quando
        necessário.<br />
        <strong>Autoridades competentes</strong>, quando exigido por lei, ordem
        judicial ou regulação aplicável.
      </p>

      <h2>5. Transferência internacional</h2>
      <p>
        Alguns dos provedores acima podem processar dados fora do Brasil. Nesses
        casos, garantimos que o tratamento ocorra sob salvaguardas adequadas
        previstas pela LGPD (art. 33), como cláusulas contratuais e provedores em
        países com nível de proteção adequado.
      </p>

      <h2>6. Retenção</h2>
      <p>
        Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da
        conta, os dados são removidos em até 30 dias, exceto registros financeiros
        e fiscais que precisamos manter por obrigação legal (mínimo 5 anos) e
        registros mínimos necessários para defesa em eventual processo judicial.
      </p>

      <h2>7. Seus direitos (LGPD)</h2>
      <p>
        Você pode, a qualquer momento, solicitar: confirmação da existência de
        tratamento; acesso aos dados; correção de dados incompletos, inexatos ou
        desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários
        ou tratados em desconformidade; portabilidade; eliminação dos dados
        tratados com base no consentimento; informação sobre compartilhamentos;
        e revogação do consentimento. Para exercer esses direitos, escreva para o
        e-mail de suporte. Você também tem direito a apresentar reclamação à ANPD
        (Autoridade Nacional de Proteção de Dados).
      </p>

      <h2>8. Cookies</h2>
      <p>
        Usamos cookies essenciais para autenticação e funcionamento do app. Não
        utilizamos cookies de rastreamento publicitário de terceiros.
      </p>

      <h2>9. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais para proteger seus dados:
        senhas armazenadas com hash, comunicação cifrada via HTTPS/TLS, políticas
        de segurança em nível de linha (RLS) no banco de dados, controle de acesso
        por papel e princípio do menor privilégio.
      </p>

      <h2>10. Atualizações desta política</h2>
      <p>
        Podemos atualizar esta política periodicamente. Mudanças relevantes serão
        comunicadas no app ou por e-mail. A data da última atualização aparece no
        topo desta página.
      </p>

      <h2>11. Contato</h2>
      <p>
        Para exercer qualquer direito, retirar consentimento ou tirar dúvidas
        sobre privacidade, escreva para o e-mail de suporte indicado dentro do app.
      </p>

      <p className="pt-4">
        <Link to="/terms">Termos de Uso</Link> ·{" "}
        <Link to="/refund">Política de Reembolso</Link>
      </p>
    </Layout>
  );
}

function Layout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100dvh", background: "#faf9f7" }}>
      <header
        style={{
          background: "linear-gradient(135deg, #1a1a18 0%, #1a1a18 60%, rgba(196,132,74,0.18) 100%)",
          padding: "max(36px, calc(env(safe-area-inset-top) + 14px)) 20px 32px",
        }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <Link
            to="/"
            search={{ list: undefined }}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
            }}
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 style={{
            marginTop: 16, fontSize: 22, fontWeight: 400, color: "#fff",
            fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "-0.02em",
          }}>
            {title}
          </h1>
          <p style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            Última atualização: {updated}
          </p>
        </div>
      </header>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 60px" }}>
        <article style={{ fontSize: 14, lineHeight: 1.7, color: "#555" }}>
          {children}
        </article>
      </div>
    </div>
  );
}
