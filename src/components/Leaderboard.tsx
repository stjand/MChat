import { useEffect } from "react";
import { supabase } from "../lib/supabase";

useEffect(() => {
  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, username, karma_points, is_verified, gender')
      .order('karma_points', { ascending: false })
      .limit(10);
    
    setTopUsers(data || []);
  };
  
  loadLeaderboard();
}, []);

function setTopUsers(arg0: { id: any; username: any; karma_points: any; is_verified: any; gender: any; }[]) {
  throw new Error("Function not implemented.");
}
