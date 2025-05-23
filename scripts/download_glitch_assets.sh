#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path_to_glitch_assets_file>"
    exit 1
fi

glitch_assets_file="$1"

if [ ! -f "$glitch_assets_file" ]; then
    echo "Error: File not found at $glitch_assets_file"
    exit 1
fi

file_dir=$(dirname "$glitch_assets_file")
assets_dir="$file_dir/assets"

# Create the assets directory if it doesn't exist
mkdir -p "$assets_dir"

# Read the file line by line and extract URLs
while IFS= read -r line; do
    echo "Processing line: $line"
    # Extract URLs using grep and sed
    url=$(echo "$line" | grep -oP '"url":\s*"\K[^"]+')

    echo "Extracted URL: $url" # Output the extracted URL

    if [ -n "$url" ]; then # Check if a URL was extracted
        # Extract filename from URL, handling %2F
        decoded_url=$(echo "$url" | sed 's/%2F/\//g') # Decode URL-encoded characters (%2F becomes /)
        filename=$(basename "$decoded_url") # Get the filename from the decoded URL

        # Download the file using curl
        echo "Downloading: $url"
        wget -O "$assets_dir/$filename" "$url" # Download the file using curl

        if [ $? -eq 0 ]; then
            echo "Downloaded: $filename"
 else
            echo "Error downloading: $url"
        fi
    fi
done < "$glitch_assets_file"

echo "Processing complete."