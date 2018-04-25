set -ex
# SET THE FOLLOWING VARIABLES
# docker hub username
USERNAME=arefaslani
# image name
IMAGE=nginx-autoconf
docker build -t $USERNAME/$IMAGE:latest .
