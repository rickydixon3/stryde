import { supabase } from '../supabase'
import { RunEfficiencyViable } from '../signals/runEfficiency'

export const getEFResults = async (userId: number) => {
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const { data: recentActivities } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .gte('start_date', sixtyDaysAgo.toISOString())

  const results: RunEfficiencyViable[] = (recentActivities ?? [])
    .filter(a => a.ef_value !== null && a.effort_level !== null)
    .map((a): RunEfficiencyViable => ({
      viable: true,
      efValue: a.ef_value,
      sampleSize: 0,
      date: a.start_date,
      activityId: a.id,
      effortLevel: a.effort_level,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return { results, recentActivities: recentActivities ?? [] }
}