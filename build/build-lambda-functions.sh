#!/usr/bin/env bash
# Builds all lambda functions.

pwd=$(pwd)
lambda_function="$1"

copy_dependencies() 
{   
        rsync -aL node_modules dist/
    
}

for D in $(find ${pwd}/src/lambda-functions -type d -mindepth 1 -maxdepth 1)
do
    (
        if [ -n "$lambda_function" ] && [ "$lambda_function" != "$(basename ${D})" ]; then
            echo -e "[FUNCTION: $(basename ${D})] → SKIPPING\n"
        else
            echo -e "[FUNCTION: $(basename ${D})] → BUILDING\n" && \
            cd $D && \
            npm install --silent && \
            npm run build --silent && \
            rm -rf node_modules && \
            npm install --only=prod && \
            copy_dependencies && \
            echo -e "[FUNCTION: $(basename ${D})] → SUCCESS\n"
        fi
    ) || echo -e "[FUNCTION: $(basename ${D})] → FAILED\n"
done