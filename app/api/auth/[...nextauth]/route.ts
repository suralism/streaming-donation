import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import db from '@/src/database';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
        }
        
        // Handle admin login first
        const adminUser = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
        const adminPass = process.env.ADMIN_PASSWORD || 'admin1234';
        
        if (credentials.username.toLowerCase().trim() === adminUser) {
          if (credentials.password === adminPass) {
            return {
              id: 'system',
              name: 'System Admin',
              email: 'admin@system.com',
              role: 'admin',
              username: 'admin'
            };
          } else {
            throw new Error('รหัสผ่านแอดมินไม่ถูกต้อง');
          }
        }

        // Find streamer in database
        const user = await db.getUserByUsername(credentials.username.trim());
        if (!user) {
          throw new Error('ไม่พบชื่อผู้ใช้งานนี้ในระบบ');
        }

        // Check password hash
        if (!user.password_hash) {
          throw new Error('บัญชีนี้ยังไม่ได้ตั้งค่ารหัสผ่าน กรุณาติดต่อแอดมิน');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) {
          throw new Error('รหัสผ่านไม่ถูกต้อง');
        }

        return {
          id: user.id,
          name: user.display_name || user.username,
          email: user.email,
          role: 'streamer',
          username: user.username
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).username = token.username;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt'
  },
  secret: process.env.NEXTAUTH_SECRET || 'supersecretkey1234'
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
