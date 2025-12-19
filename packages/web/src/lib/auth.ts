import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";

/**
 * /packages/web/src/lib/auth.ts
 *
 * IMPLEMENTAÇÃO REAL (NextAuth v4)
 *
 * OBJETIVO:
 * Configura as opções de autenticação para o NextAuth.
 * Substitui os mocks anteriores por provedores reais (Google).
 */

export const authOptions: NextAuthOptions = {
    // É crucial definir o segredo para criptografia dos tokens (gerado via `openssl rand -base64 32`)
    secret: process.env.NEXTAUTH_SECRET,

    providers: [
        GoogleProvider({
            // Usa as variáveis de ambiente padrão ou as definidas explicitamente
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
        // Mantido o EmailProvider caso deseje usar Magic Links (requer configuração de SMTP)
        EmailProvider({
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM,
        }),
    ],

    // Estratégia JWT para não depender de banco de dados diretamente na sessão (stateless)
    // Ideal para comunicar com o backend Hono via token Bearer
    session: {
        strategy: "jwt",
    },

    callbacks: {
        // Callback chamado na criação/atualização do JWT
        async jwt({ token, user, account }) {
            // Na primeira vez que o usuário loga, o objeto 'user' está disponível.
            // Persistimos o ID do usuário no token para usar nas requisições ao backend.
            if (user) {
                token.id = user.id;
            }
            // Se precisar persistir o access_token do Google:
            if (account) {
                token.accessToken = account.access_token;
            }
            return token;
        },

        // Callback chamado sempre que a sessão é verificada (useSession, getSession)
        async session({ session, token }) {
            // Passa o ID do token para a sessão do cliente
            if (session.user) {
                // @ts-ignore: O tipo padrão do NextAuth não tem 'id', ignoramos ou estendemos via d.ts
                session.user.id = token.id as string;
            }
            return session;
        },
    },

    // Páginas customizadas
    pages: {
        signIn: '/login',
        // error: '/auth/error', // Recomendado criar uma página de erro
    },
};

export default authOptions;