export const dynamic = 'force-static'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, type, broker, balance, lastUpdated } = body

    if (!name) {
      return NextResponse.json({ error: 'Missing account name' }, { status: 400 })
    }

    // Map client keys to DB columns
    const payload = {
      name,
      type,
      broker,
      balance,
      last_updated: lastUpdated,
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('accounts')
      .insert([payload])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, name, type, broker, balance, lastUpdated } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing account id' }, { status: 400 })
    }

    const payload: any = {}
    if (name !== undefined) payload.name = name
    if (type !== undefined) payload.type = type
    if (broker !== undefined) payload.broker = broker
    if (balance !== undefined) payload.balance = balance
    if (lastUpdated !== undefined) payload.last_updated = lastUpdated

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('accounts')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
