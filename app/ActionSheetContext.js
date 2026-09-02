import React, { createContext, useContext, useState } from 'react';

const ActionSheetContext = createContext(null);

export function ActionSheetProvider({ children }) {
  const [visible, setVisible] = useState(false);

  const open = () => setVisible(true);
  const close = () => setVisible(false);

  return (
    <ActionSheetContext.Provider value={{ visible, open, close }}>
      {children}
    </ActionSheetContext.Provider>
  );
}

export function useActionSheet() {
  const ctx = useContext(ActionSheetContext);
  if (!ctx) {
    throw new Error('useActionSheet doit être utilisé à l\'intérieur d\'un ActionSheetProvider');
  }
  return ctx;
}