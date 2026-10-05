import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface NoteProps {
  state: string;
  setState: React.Dispatch<React.SetStateAction<string>>;
}

const Note = ({ state, setState }: NoteProps) => {
  const { t } = useTranslation();

  return(
    <div>
      <div className="form_column">
        <div className="textarea_item">
          <textarea
            id="order-note"
            name="note"
            aria-label={t("chceknote")}
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
        </div>
        <div className="textarea_item"></div>
      </div>
    </div>
  )
}

export default Note
