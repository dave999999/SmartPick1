import { schema, OutputType } from "./upload_POST.schema";
import superjson from "superjson";

export async function handle(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const result = schema.parse(json);

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      throw new Error("IMGBB_API_KEY is not configured");
    }

    // Remove data URL prefix if present
    let imageData = result.image;
    if (imageData.startsWith("data:")) {
      imageData = imageData.split(",")[1];
    }

    const formData = new FormData();
    formData.append("image", imageData);
    if (result.name) {
      formData.append("name", result.name);
    }

    const imgbbResponse = await fetch(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!imgbbResponse.ok) {
      const errorText = await imgbbResponse.text();
      console.error("ImgBB API error:", errorText);
      throw new Error("Failed to upload image to ImgBB");
    }

    const imgbbData = await imgbbResponse.json();

    if (!imgbbData.success || !imgbbData.data?.url) {
      throw new Error("Invalid response from ImgBB");
    }

    return new Response(
      superjson.stringify({
        success: true,
        url: imgbbData.data.url,
      } satisfies OutputType)
    );
  } catch (error) {
    console.error("Image upload error:", error);
    return new Response(
      superjson.stringify({
        error:
          error instanceof Error ? error.message : "Failed to upload image",
      }),
      { status: 400 }
    );
  }
}