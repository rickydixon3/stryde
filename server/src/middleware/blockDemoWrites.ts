import { Response, NextFunction } from 'express';
import { supabase } from '../supabase';
import { AuthenticatedRequest } from './requireAuth';

export const blockDemoWrites = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { data: user, error } = await supabase
        .from('users')
        .select('is_demo')
        .eq('id', req.userId)
        .single();

    if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
    }

    if (user.is_demo) {
        return res.status(403).json({ error: 'This action is disabled in demo mode' });
    }

    next();
};