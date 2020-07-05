import {
  useContext,
  useMemo,
} from 'react';
import AppContext from '../context/app';

function useHomeEnabled() {
  const [app] = useContext(AppContext);

  return useMemo(() => {
    if (app.status === 'init') {
      return true;
    }

    if (app.following.length > 0) {
      return true;
    }

    return false;
  }, [
    app.status,
    app.following,
  ]);
}

export default useHomeEnabled;
