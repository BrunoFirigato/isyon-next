import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export default async function proxy(req: NextRequest) {
  let response = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Renova sessão se expirada (não usar getSession — usa getUser por segurança)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = req.nextUrl.pathname
  const isLoginNormal     = path.startsWith('/login')
  const isLoginSuperadmin = path.startsWith('/admin')
  const isCadastro        = path.startsWith('/cadastro')
  const isRedefinirSenha  = path.startsWith('/redefinir-senha')
  const isLegal           = path.startsWith('/politica-privacidade') || path.startsWith('/termos-de-uso')
  const isPublic = isLoginNormal || isLoginSuperadmin || isCadastro || isRedefinirSenha || isLegal

  // Não autenticado tentando acessar rota protegida
  if (!user && !isPublic) {
    // Superadmin sem sessão vai para /admin, demais para /login
    const dest = path.startsWith('/superadmin') ? '/admin' : '/login'
    return NextResponse.redirect(new URL(dest, req.nextUrl))
  }

  // Já autenticado tentando acessar página de login
  if (user && isLoginNormal) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  // Superadmin autenticado tentando acessar /admin → manda para /superadmin
  if (user && isLoginSuperadmin) {
    return NextResponse.redirect(new URL('/superadmin', req.nextUrl))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
