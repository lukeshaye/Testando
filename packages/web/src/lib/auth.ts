/**
 * /packages/web/src/lib/auth.ts
 *
 * (Executor: LLM 2)
 *
 * OBJETIVO:
 * [cite_start]Conforme a Tarefa 4.6, Item 5 do PLANO_DE_FEATURE_Parte_2_Core[cite: 160].
 * [cite_start]Este arquivo substitui o SupabaseAuthProvider legado [cite: 161] e configura
 * as opções de autenticação (AuthOptions) para o NextAuth/Auth.js.
 *
 * PRINCÍPIOS APLICADOS (do plano):
 * - DSpP (2.16): Centraliza a lógica de autenticação em um framework robusto (NextAuth).
 * - SoC (2.5): Isola a responsabilidade de autenticação.
 */

// Para ambientes não-Next.js (como Vite/React), as importações
// do Auth.js/NextAuth são mockadas ou substituídas por placeholders.

// Exemplo de imports, se estivesse em um ambiente Next.js:
// import type { AuthOptions } from "next-auth";
// import GoogleProvider from "next-auth/providers/google";
// import EmailProvider from "next-auth/providers/email";

// Mock de tipos e funções para aderir à estrutura do plano:
type AuthOptions = any;
const GoogleProvider = (config: any) => config;
const EmailProvider = (config: any) => config;


/**
 * Configura as opções do NextAuth para a aplicação.
 * Este objeto é a espinha dorsal do gerenciamento de sessão e tokens.
 */
export const authOptions: AuthOptions = {
    // Definir os provedores (ex: Google, Email) que o frontend usará.
    providers: [
        GoogleProvider({
            // Variáveis de ambiente devem ser configuradas para o ambiente de execução (ex: .env.local)
            clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
        }),
        EmailProvider({
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM,
        }),
    ],

    // Define a estratégia de sessão a ser utilizada.
    session: {
        strategy: "jwt",
    },

    // Adapter para se comunicar com o backend Hono / Supabase.
    // Em uma arquitetura com Hono, o JWT é a forma preferida de manter o estado,
    // com o backend (Hono) validando o token.
    /*
    // Se fosse usar um adapter:
    adapter: PostgresAdapter(database),
    */

    // Callbacks para customizar o JWT e o objeto de sessão.
    callbacks: {
        async jwt({ token, user }: any) {
            // Adicionar o ID do usuário (do banco de dados) ao token
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }: any) {
            // Expor o ID do usuário no objeto de sessão para uso no frontend
            session.user.id = token.id;
            return session;
        },
    },

    // Páginas customizadas (opcional, comum para evitar a UI padrão do NextAuth)
    pages: {
        signIn: '/login',
    },
};

export default authOptions;