import { useCallback, useRef, useState } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';

/**
 * `const { confirm, dialog } = useConfirm()` — await `confirm({...})` where a
 * `window.confirm` would have gone, and render `{dialog}` once in the page.
 *
 * The promise keeps the call site reading top to bottom, so the guard sits
 * directly above the request it guards rather than in a separate handler that
 * has to remember which row it was about.
 */
export const useConfirm = () => {
  const [request, setRequest] = useState(null);
  const resolve = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((done) => {
        resolve.current = done;
        setRequest(options);
      }),
    []
  );

  const settle = (answer) => {
    const done = resolve.current;
    resolve.current = null;
    setRequest(null);
    done?.(answer);
  };

  const dialog = request ? (
    <ConfirmDialog
      {...request}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null;

  return { confirm, dialog };
};

export default useConfirm;
