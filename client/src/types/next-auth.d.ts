import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {

  interface Session {
    user: {
      id: string      
      username: string 
      bio?: string
    } & DefaultSession["user"]
  }

  interface User {
    db_id?: string
    username?: string
    bio?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    db_id?: string
    username?: string
  }
}