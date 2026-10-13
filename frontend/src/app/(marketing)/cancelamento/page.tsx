import type { Metadata } from "next";

import { LegalPage } from "@/components/sections/legal-page";

export const metadata: Metadata = { title: "Cancelamento e Reembolso — Donc" };

export default function CancellationPage() {
  return (
    <LegalPage title="Cancelamento e Reembolso">
      <section>
        <h2>1. Cancelar a assinatura</h2>
        <p>
          Você cancela quando quiser, direto na página de assinatura. O acesso continua até o fim do período já pago e não há novas
          cobranças depois disso.
        </p>
      </section>
      <section>
        <h2>2. Direito de arrependimento (7 dias)</h2>
        <p>
          Conforme o artigo 49 do Código de Defesa do Consumidor, você pode desistir da contratação em até 7 dias corridos após a
          assinatura e receber o valor pago de volta integralmente.
        </p>
      </section>
      <section>
        <h2>3. Como pedir o reembolso</h2>
        <p>Abra um chamado no suporte da plataforma dentro do prazo. O estorno é feito pelo mesmo meio de pagamento usado na compra.</p>
      </section>
      <section>
        <h2>4. Falha de cobrança</h2>
        <p>
          Se uma cobrança falhar, você mantém o acesso por alguns dias de tolerância e recebe um aviso por e-mail. Sem regularização, o
          acesso é suspenso.
        </p>
      </section>
    </LegalPage>
  );
}
