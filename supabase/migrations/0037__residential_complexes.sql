SELECT polname, polroles, polcmd, polqual, polwithcheck 
FROM pg_policy 
WHERE polrelid = 'residential_complexes'::regclass;