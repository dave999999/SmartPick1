import React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./Dialog";
import { Button } from "./Button";
import styles from "./DeleteConfirmDialog.module.css";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName: string;
  className?: string;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  className,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`${styles.dialogContent} ${className || ""}`}>
        <DialogHeader className={styles.header}>
          <div className={styles.iconWrapper}>
            <AlertTriangle className={styles.icon} />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            <br />
            You are about to delete: <strong>{itemName}</strong>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className={styles.footer}>
          <DialogClose asChild>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Confirm Deletion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};