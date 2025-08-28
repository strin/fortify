import { creatorStorage } from "@/lib/supabase";

export async function uploadBlobImgFromUrl(path: string, image: any) {
    let newImg = image;
    try {
        if (typeof image === 'string') {
            const response = await fetch(image);
            newImg = await response.blob();
        }

        const { data, error } = await creatorStorage.upload(path, newImg);

        if (error) {
            console.error('Upload error:', error.message);
            return null;
        }
        return data?.path;
    } catch (error: any) {
        console.error('Error fetching or uploading image:', error.message);
        return null;
    }
}
