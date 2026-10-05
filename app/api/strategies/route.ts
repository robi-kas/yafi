export const dynamic = 'force-static'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body || !body.name) return NextResponse.json({ error: 'Missing strategy name' }, { status: 400 })

    const supabase = await createClient()
    const { data, error } = await supabase.from('strategies').insert([body]).select().single()
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
    const { data, error } = await supabase.from('strategies').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, name, description, trades, win_rate, avg_win, avg_loss, rules, risk_per_trade } = body

    if (!id) return NextResponse.json({ error: 'Missing strategy id' }, { status: 400 })

    const payload: any = {}
    if (name !== undefined) payload.name = name
    if (description !== undefined) payload.description = description
    if (trades !== undefined) payload.trades = trades
    if (win_rate !== undefined) payload.win_rate = win_rate
    if (avg_win !== undefined) payload.avg_win = avg_win
    if (avg_loss !== undefined) payload.avg_loss = avg_loss
    if (rules !== undefined) payload.rules = rules
    if (risk_per_trade !== undefined) payload.risk_per_trade = risk_per_trade

    const supabase = await createClient()
    const { data, error } = await supabase.from('strategies').update(payload).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing strategy id' }, { status: 400 })

    const supabase = await createClient()
    const { error } = await supabase.from('strategies').delete().eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
