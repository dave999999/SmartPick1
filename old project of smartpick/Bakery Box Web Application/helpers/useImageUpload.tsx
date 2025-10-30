import { useMutation } from "@tanstack/react-query";
import { postUploadImage, type InputType } from "../endpoints/images/upload_POST.schema";

export const useUploadImageMutation = () => {
  return useMutation({
    mutationFn: (data: InputType) => postUploadImage(data),
  });
};