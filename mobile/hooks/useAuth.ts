import { useState, useEffect } from 'react';
import { apiGet } from '../services/apiClient';

export function useAuth(){
  const [user, setUser] = useState<any | null>(null);

  useEffect(()=>{
    let mounted = true;
    apiGet('/session').then((s)=>{ if(mounted) setUser(s?.user ?? null); }).catch(()=>{});
    return ()=>{ mounted = false; };
  },[]);

  return { user };
}
