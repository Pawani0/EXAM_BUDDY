import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { useState } from "react";

interface FileUploadCardProps {
    title: string;
    description: string;
    accept: string;
    multiple?: boolean;
    onFilesSelected: (files: File[]) => void;
    files: File[];
}

export const FileUploadCard = ({
    title,
    description,
    accept,
    multiple = false,
    onFilesSelected,
    files
}: FileUploadCardProps) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            onFilesSelected(multiple ? [...files, ...newFiles] : newFiles);
        }
    };

    const removeFile = (index: number) => {
        onFilesSelected(files.filter((_, i) => i !== index));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                    <input
                        type="file"
                        id={`upload-${title}`}
                        className="hidden"
                        accept={accept}
                        multiple={multiple}
                        onChange={handleFileChange}
                    />
                    <label htmlFor={`upload-${title}`} className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-medium">
                            Click to upload {multiple ? "files" : "file"}
                        </span>
                    </label>
                </div>

                {files.length > 0 && (
                    <div className="space-y-2">
                        {files.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                <span className="text-sm truncate flex-1">{file.name}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(index)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
