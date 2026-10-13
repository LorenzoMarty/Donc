import type { Metadata } from "next";

import { LegalPage } from "@/components/sections/legal-page";

export const metadata: Metadata = { title: "Política de Privacidade — Donc" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade">
      <section>
        <h2>1. Dados que coletamos</h2>
        <ul>
          <li>Cadastro: nome, e-mail e senha (guardada de forma criptografada).</li>
          <li>Uso: progresso em aulas, exercícios e jogos, redações enviadas e notas.</li>
          <li>Pagamento: o Mercado Pago processa a cobrança; não guardamos dados de cartão.</li>
        </ul>
      </section>
      <section>
        <h2>2. Para que usamos</h2>
        <p>
          Prestar o serviço, personalizar o estudo, corrigir redações, cobrar a assinatura, enviar e-mails do serviço e melhorar a
          plataforma. A base legal é a execução do contrato e, quando aplicável, o seu consentimento (LGPD, Lei 13.709/2018).
        </p>
      </section>
      <section>
        <h2>3. Inteligência artificial e a OpenAI</h2>
        <p>
          O texto das suas redações é enviado à OpenAI, nossa operadora de IA, apenas para gerar a correção.
        </p>
      </section>
      <section>
        <h2>4. Menores de idade</h2>
        <p>
          Tratamos dados de menores no melhor interesse deles e com o consentimento de um responsável legal. O responsável pode pedir a
          exclusão dos dados a qualquer momento.
        </p>
      </section>
      <section>
        <h2>5. Cookies</h2>
        <p>Usamos cookies essenciais para manter você conectado e proteger a conta. Não usamos cookies de publicidade.</p>
      </section>
      <section>
        <h2>6. Compartilhamento</h2>
        <p>
          Compartilhamos dados apenas com operadores necessários ao serviço (hospedagem, e-mail, pagamento e IA) ou por obrigação legal.
          Não vendemos dados pessoais.
        </p>
      </section>
      <section>
        <h2>7. Seus direitos</h2>
        <p>
          Você pode pedir acesso, correção, exportação e exclusão dos seus dados, e revogar consentimentos, pelo canal de suporte da
          plataforma.
        </p>
      </section>
    </LegalPage>
  );
}
