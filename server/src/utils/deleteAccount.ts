import { supabase } from '../supabase';
import { getValidAccessToken } from './strava';

// purging user data
// triggered when user revokes access via strava and when manually deletes in application
export const purgeUserAccount = async (userId: number) => {
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (!user) {
        return { success: false, error: 'User not found' };
    }

    try {
        const accessToken = await getValidAccessToken(user);
        await fetch('https://www.strava.com/oauth/revoke', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
    } catch (err) {
        console.log('Strava revoke error during purge:', err);
    }

    await supabase
        .from('activities')
        .delete()
        .eq('user_id', userId);

    const { error: userDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

    if (userDeleteError) {
        return { success: false, error: userDeleteError.message };
    }

    return { success: true };
};