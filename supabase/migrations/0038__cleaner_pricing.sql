SELECT polname, polroles, polcmd, polqual, polwithcheck 
FROM pg_policy 
WHERE polrelid = 'cleaner_pricing'::regclass;