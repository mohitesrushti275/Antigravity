-- Create the increment_download_count RPC function
-- Called by the download route to atomically increment the download counter
CREATE OR REPLACE FUNCTION public.increment_download_count(comp_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE components
  SET download_count = download_count + 1,
      updated_at = now()
  WHERE id = comp_id;
END;
$$;

-- Grant execute to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.increment_download_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_download_count(UUID) TO service_role;
