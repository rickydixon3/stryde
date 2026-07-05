import { supabase } from '../supabase'
import { computeBaselines } from './baselines'
import { computeRunEfficiency } from '../signals/runEfficiency'

export const getEFResults = async (userId: number) => {
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const { data: user } = await supabase
    .from('users')
    .select('resting_hr, max_hr')
    .eq('id', userId)
    .single()

  const { data: allActivities } = await supabase.from('activities').select('*').eq('user_id', userId)
  const baselines = computeBaselines(allActivities)

  const { data: recentActivities } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .gte('start_date', sixtyDaysAgo.toISOString())

  const activityIds = recentActivities.map(a => a.id)
  const { data: recentStreams } = await supabase
    .from('activity_streams')
    .select('*')
    .in('activity_id', activityIds)

  const activitiesWithStreams = recentActivities.map(activity => ({
    ...activity,
    stream: recentStreams.find(s => s.activity_id === activity.id)
  }))

  const results = activitiesWithStreams
    .map(activity => computeRunEfficiency(activity, user.resting_hr, user.max_hr, baselines))
    .filter(r => r.viable)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return { results, recentActivities, baselines, activitiesWithStreams }
}