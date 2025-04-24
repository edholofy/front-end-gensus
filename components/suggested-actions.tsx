'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import { UseChatHelpers } from '@ai-sdk/react';

interface SuggestedActionsProps {
  chatId: string;
  append: UseChatHelpers['append'];
}

function PureSuggestedActions({ chatId, append }: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'Remote Work Survey',
      label: 'Create a survey about remote work preferences among millennials',
      action: 'Create a survey about remote work preferences among millennials',
    },
    {
      title: 'Smartphone Usage',
      label: 'Run a market research survey on smartphone usage among Gen Z',
      action: 'Run a market research survey on smartphone usage among Gen Z',
    },
    {
      title: 'EV Preferences',
      label: 'Generate survey results for consumer preferences in electric vehicles',
      action: 'Generate survey results for consumer preferences in electric vehicles',
    },
    {
      title: 'Streaming Services',
      label: 'Create a survey about streaming service preferences among 25-40 year olds',
      action: 'Create a survey about streaming service preferences among 25-40 year olds',
    },
  ];

  return (
    <div
      data-testid="suggested-actions"
      className="grid sm:grid-cols-2 gap-4 w-full"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);

              append({
                role: 'user',
                content: suggestedAction.action,
              });
            }}
            className="text-left border rounded-xl px-4 py-4 text-sm flex flex-col w-full h-auto min-h-[120px] justify-start items-start overflow-visible"
          >
            <span className="font-medium mb-2 text-base">{suggestedAction.title}</span>
            <span className="text-muted-foreground text-xs leading-relaxed whitespace-normal">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
