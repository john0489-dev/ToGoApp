import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Política de Reembolso — To Go" },
      { name: "description", content: "Política de reembolso da assinatura To Go Pro." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <Layout title="Política de Reembolso" updated="23 de abril de 2026">
      <p>
        Esta política descreve as condições para reembolso da assinatura{" "}
        <strong>To Go Pro</strong>, produto operado por{" "}
        <strong>John Charles Long</strong>.
      </p>

      <h2>1. Garantia de devolução do dinheiro — 30 dias</h2>
      <p>
        Oferecemos uma <strong>garantia de devolução do dinheiro de 30 dias</strong>.
        Se você não estiver satisfeito com sua compra, pode solicitar reembolso
        integral em até 30 dias corridos a partir da data do pedido, sem
        necessidade de justificativa. Esse prazo cobre — e amplia — o direito de
        arrependimento previsto no art. 49 do Código de Defesa do Consumidor
        (CDC) brasileiro.
      </p>

      <h2>2. Como solicitar o reembolso</h2>
      <p>
        Para solicitar reembolso, escreva para o e-mail de suporte do To Go com
        o assunto "Reembolso To Go Pro", informando o e-mail da conta e a data
        da compra. Processaremos sua solicitação em até 5 dias úteis.
      </p>

      <h2>3. Reembolsos fora da janela de 30 dias</h2>
      <p>
        Solicitações fora da janela de 30 dias podem ainda ser avaliadas
        caso a caso. Recomendamos abrir o pedido pelo e-mail de suporte
        descrevendo a situação.
      </p>

      <h2>4. Cancelamento sem reembolso</h2>
      <p>
        Você pode cancelar a renovação a qualquer momento pelo portal de
        gerenciamento da assinatura e continuar usando o Pro até o fim do
        período já pago. Após esse prazo, sua conta volta automaticamente para
        o plano Free e nenhuma cobrança futura será feita.
      </p>

      <h2>5. Forma de devolução</h2>
      <p>
        O reembolso é processado no mesmo meio de pagamento usado na compra,
        via Stripe. Pode levar de 5 a 10 dias úteis para aparecer na sua
        fatura, dependendo do banco emissor.
      </p>

      <h2>6. Contato</h2>
      <p>
        Para qualquer dúvida, escreva para o e-mail de suporte do To Go.
        Veja também os <Link to="/terms">Termos de Uso</Link> e a{" "}
        <Link to="/privacy">Política de Privacidade</Link>.
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
    <div className="min-h-[100dvh] bg-background">
      <header
        className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6"
        style={{ background: "var(--hero-gradient)" }}
      >
        <div className="mx-auto max-w-2xl">
          <Link
            to="/"
            search={{ list: undefined }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20 text-primary-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-primary-foreground tracking-tight">
            {title}
          </h1>
          <p className="mt-1 text-xs text-primary-foreground/80">
            Última atualização: {updated}
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-5 py-8">
        <article className="prose prose-sm max-w-none text-foreground [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_a]:text-primary [&_a]:underline">
          {children}
        </article>
      </div>
    </div>
  );
}
