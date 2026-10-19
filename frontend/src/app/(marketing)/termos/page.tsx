import type { Metadata } from "next";

import { marketingMetadata } from "@/lib/site";
import { LegalPage } from "@/components/sections/legal-page";

export const metadata: Metadata = marketingMetadata("/termos");

export default function TermsPage() {
  return (
    <LegalPage title="Termos de Uso">
      <section>
        <h2>1. O serviço</h2>
        <p>
          O Donc é uma plataforma paga de preparação para Português e Redação do ENEM, com aulas, exercícios, jogos e correção de
          redações assistida por inteligência artificial. Ao criar uma conta ou assinar, você concorda com estes Termos.
        </p>
      </section>
      <section>
        <h2>2. Conta e idade</h2>
        <p>
          Você é responsável pelos dados e pela senha da sua conta. Menores de 18 anos devem usar o Donc com a ciência e o consentimento
          de um responsável legal, que responde pela contratação.
        </p>
      </section>
      <section>
        <h2>3. Assinatura e pagamento</h2>
        <p>
          O acesso exige assinatura mensal ou anual, cobrada de forma recorrente pelo Mercado Pago. Os valores aparecem antes da
          contratação. As regras de cancelamento e reembolso estão na Política de Cancelamento e Reembolso.
        </p>
      </section>
      <section>
        <h2>4. Correção por inteligência artificial</h2>
        <p>
          A nota e o feedback das redações são estimativas geradas por IA. Servem como apoio ao estudo e não garantem a nota que você
          receberá na prova oficial do ENEM.
        </p>
      </section>
      <section>
        <h2>5. Uso permitido</h2>
        <ul>
          <li>Uso pessoal: a conta não pode ser compartilhada nem revendida.</li>
          <li>É proibido copiar, redistribuir ou gravar o conteúdo (aulas, PDFs, questões) sem autorização.</li>
          <li>É proibido tentar burlar limites técnicos ou prejudicar o funcionamento da plataforma.</li>
        </ul>
      </section>
      <section>
        <h2>6. Suspensão</h2>
        <p>Contas que violem estes Termos podem ser suspensas ou encerradas, sem prejuízo das medidas legais cabíveis.</p>
      </section>
      <section>
        <h2>7. Alterações e contato</h2>
        <p>
          Podemos atualizar estes Termos; mudanças relevantes serão comunicadas e a versão aceita fica registrada na sua conta. Dúvidas:
          use o canal de suporte dentro da plataforma.
        </p>
      </section>
    </LegalPage>
  );
}
