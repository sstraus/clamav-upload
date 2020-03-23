FROM node:11.8-stretch-slim
LABEL maintainer="Stefano Straus <stefano+docker@straus.it>"
LABEL version="1.0"

# based on excellent work of Yeung Yiu Hung <hkclex@gmail.com> and others

# Install ClamAV and supervisord
# Debian Base to use
ENV DEBIAN_VERSION stretch
ENV CLAM_VERSION=0.102.2

# Install ClamAV and supervisor
RUN echo "deb http://http.debian.net/debian/ $DEBIAN_VERSION main contrib non-free" > /etc/apt/sources.list && \
    echo "deb http://http.debian.net/debian/ $DEBIAN_VERSION-updates main contrib non-free" >> /etc/apt/sources.list && \
    echo "deb http://security.debian.org/ $DEBIAN_VERSION/updates main contrib non-free" >> /etc/apt/sources.list && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -y -qq \
        build-essential \
        libssl-dev \
        libcurl4-openssl-dev \
        zlib1g-dev \
        libpng-dev \
        libxml2-dev \
        libjson-c-dev \
        libbz2-dev \
        libpcre3-dev \
        ncurses-dev \
        libclamunrar7 \
        supervisor \
        gcc \ 
        openssl \
        wget \
        make 

RUN wget https://www.clamav.net/downloads/production/clamav-${CLAM_VERSION}.tar.gz && \
    tar xvzf clamav-${CLAM_VERSION}.tar.gz && \
    cd clamav-${CLAM_VERSION} && \
    ./configure && \
    make && make install && \
    apt-get remove -y gcc make && \
    apt-get -y autoclean && \
    apt-get -y clean && \
    apt-get -y autoremove && \
    rm -rf /var/lib/apt/lists/*

RUN echo "/usr/lib" >> /etc/ld.so.conf.d/clamav.conf && \
    ldconfig -v

# Update Permission
RUN groupadd -r clamav && \
    useradd -r -g clamav -u 1001 clamav -d /var/lib/clamav && \
    mkdir -p /var/lib/clamav && \
    mkdir /usr/local/share/clamav && \
    mkdir /var/run/clamav && \
    mkdir /var/log/clamav && \
    mkdir /server && \
    chown -R clamav:clamav /server \
    /var/lib/clamav \
    /usr/local/share/clamav \
    /var/run/clamav \
    /usr/local/lib \
    /usr/local/etc/ \
    /var/log/clamav/ && \
    chmod 750 /var/run/clamav /server

# Initial update of av databases 
RUN wget -t 5 -T 9999 -O /var/lib/clamav/main.cvd http://database.clamav.net/main.cvd && \
    wget -t 5 -T 9999 -O /var/lib/clamav/daily.cvd http://database.clamav.net/daily.cvd && \
    wget -t 5 -T 9999 -O /var/lib/clamav/bytecode.cvd http://database.clamav.net/bytecode.cvd && \
    chown clamav:clamav /var/lib/clamav/*.cvd

# Volume provision
VOLUME ["/var/lib/clamav"]

WORKDIR /server

COPY . /server

RUN npm install && npm run postinstall && npm prune --production

# Copy supervisor and clam config
COPY ./configs/supervisord.conf /etc/supervisor/conf.d/supervisord-nodejs.conf
COPY ./configs/clamd.conf  /usr/local/etc/clamd.conf
COPY ./configs/freshclam.conf  /usr/local/etc/freshclam.conf 

EXPOSE 3000
CMD ["/usr/bin/supervisord", "-n"]