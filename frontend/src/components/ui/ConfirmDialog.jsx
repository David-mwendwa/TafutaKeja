import { useEffect, useId, useRef } from 'react';

const CONFIRM_TONE = {
  danger: 'btn-primary !bg-red-700 hover:!bg-red-800',
  primary: 'btn-primary',
};

/**
 * The app's one "are you sure?".
 *
 * `window.confirm` was doing this job in a single place, which is three
 * problems at once: it cannot be styled, it cannot say more than one line, and
 * a browser that suppresses repeated dialogs silently answers it for the
 * reader. Everything consequential now goes through this instead.
 */
export const ConfirmDialog = ({
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  onCancel,
}) => {
  const id = useId();
  const panel = useRef(null);
  const confirmButton = useRef(null);
  const cancelButton = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    const { overflow } = document.body.style;

    /*
     * Taking the scrollbar away makes the page that much wider, and the frame
     * is centred, so everything under the dialog used to slide sideways by half
     * a scrollbar whenever one opened. `scrollbar-gutter: stable` on `html`
     * (see index.css) keeps the space reserved through the lock, so there is
     * nothing to compensate for here. Measuring the gutter and padding it back
     * on was the obvious fix and it is wrong: it narrows the centring context
     * as well, which moves the frame the other way by the same amount.
     */
    document.body.style.overflow = 'hidden';

    // The destructive action is never what the keyboard lands on: a reader who
    // hits Enter out of habit should cancel, not delete.
    (tone === 'danger' ? cancelButton : confirmButton).current?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      // Focus stays inside the dialog while it is open, or Tab walks off into
      // the page behind it — which is still there, just unreachable by mouse.
      const focusable = panel.current?.querySelectorAll('button, [href], input, select, textarea');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [tone, onCancel]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-dark-950/60 backdrop-blur-[2px]"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={body ? `${id}-body` : undefined}
        className="card relative w-full max-w-md p-6 shadow-card-hover"
      >
        <h2 id={`${id}-title`} className="font-heading text-lg font-bold">
          {title}
        </h2>
        {body ? (
          <p id={`${id}-body`} className="mt-2 text-sm text-dark-600 dark:text-dark-400">
            {body}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelButton} type="button" onClick={onCancel} className="btn-outline">
            {cancelLabel}
          </button>
          <button
            ref={confirmButton}
            type="button"
            onClick={onConfirm}
            className={CONFIRM_TONE[tone] || CONFIRM_TONE.primary}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
