-- Create query_history table for persistent activity feed
CREATE TABLE public.query_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  proposal TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  approved BOOLEAN,
  rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.query_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (public access for now)
CREATE POLICY "Allow public read access" 
ON public.query_history 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access" 
ON public.query_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON public.query_history 
FOR UPDATE 
USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.query_history;

-- Create index for faster queries
CREATE INDEX idx_query_history_created_at ON public.query_history(created_at DESC);