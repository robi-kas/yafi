export const dynamic = 'force-static'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Basic validation
    if (!body || !body.symbol) {
      return NextResponse.json({ error: 'Missing trade symbol' }, { status: 400 })
    }

    // Map camelCase payload keys from the client to snake_case DB columns
    const payload: any = {
      symbol: body.symbol,
      market: body.market,
      direction: body.direction,
      entry_price: body.entryPrice,
      stop_loss: body.stopLoss,
      take_profit: body.takeProfit,
      exit_price: body.exitPrice,
      position_size: body.lotSize,
      profit_loss: body.profitLoss,
      result: body.result,
      risk_to_reward: body.riskToReward,
      strategy: body.strategy,
      entry_time: body.entryTime,
      exit_time: body.exitTime,
      emotional_state: body.emotionalState,
      notes: body.notes,
      tags: body.tags,
      screenshots: body.screenshots,
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('trades')
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
      .from('trades')
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

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const id = body?.id || null
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = await createClient()
    const { data, error } = await supabase.from('trades').delete().eq('id', id).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
