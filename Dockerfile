FROM sickcodes/docker-osx:latest

# Override the Launch.sh to use monitor socket
RUN sed -i 's/-monitor stdio/-monitor unix:\/tmp\/qemu-monitor.sock,server,nowait/g' /home/arch/OSX-KVM/Launch.sh

# Use unRAID-style VNC configuration with X11 forwarding for better input handling  
RUN sed -i 's/-vnc 0.0.0.0:99/-display none -vnc 0.0.0.0:99,password=off/' /home/arch/OSX-KVM/Launch.sh

# Set X11 display environment variable like unRAID setup
ENV DISPLAY=:0.0

# Install socat for monitor access
RUN sudo pacman -Sy --noconfirm socat
