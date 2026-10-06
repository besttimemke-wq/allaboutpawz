import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith('your-')) {
    return NextResponse.redirect(`${origin}/learn`)
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }) },
      },
    })

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      // Query the existing lms.lms_roles table for active roles
      const { data: rolesData } = await supabase
        .from('lms_roles')
        .select('role, status')
        .eq('user_id', data.user.id)
        .eq('status', 'active')
      const activeRoles = rolesData?.map((r: any) => r.role) || []

      // Also check staff table for admin/groomer roles
      const { data: staffData } = await supabase
        .from('staff')
        .select('role')
        .eq('email', data.user.email)
      if (staffData) {
        staffData.forEach((s: any) => {
          if (s.role === 'owner' || s.role === 'admin') activeRoles.push('admin')
          if (s.role === 'groomer' || (s.role && s.role.includes('groomer'))) activeRoles.push('groomer')
        })
      }

      if (activeRoles.includes('admin')) return NextResponse.redirect(`${origin}/portal/admin`)
      if (activeRoles.includes('groomer')) return NextResponse.redirect(`${origin}/portal/groomer`)
      if (activeRoles.includes('learner')) return NextResponse.redirect(`${origin}/learn/classroom`)
      return NextResponse.redirect(`${origin}/learn/classroom`)
    }
  }

  return NextResponse.redirect(`${origin}/learn/sign-in`)
}
