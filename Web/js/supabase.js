import{ createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL="https://hobflhqpndluwvcuyhgp.supabase.co"
const SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvYmZsaHFwbmRsdXd2Y3V5aGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Njg4MzQsImV4cCI6MjA5NjU0NDgzNH0.4WoHu_iRsYPuLB4HskAhiUUaxBFXNgLtQs1GxztBzj4"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
if(supabase.auth){
    console.log("holbogdsn bn")
    console.log(supabase.auth)

}
