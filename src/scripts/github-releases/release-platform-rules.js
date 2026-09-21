

const releasePlatformArchRules = {
            windows: { name: 'Windows', keywords: ['windows', 'win', 'win10', 'win11'], arch: { x64: ['win64', 'x64', 'amd64'], x86: ['win32', 'x86', 'ia32', 'i386', 'i686', '386'], arm64: ['arm64'] } },
            macos: { name: 'MacOS', keywords: ['macos', 'osx', 'darwin'], arch: { x64: ['x64', 'amd64', 'intel'], arm64: ['arm64', 'aarch64', 'apple', 'universal'] } },
            linux: { name: 'Linux', keywords: ['linux'], arch: { x64: ['x64', 'amd64', 'x86_64'], x86: ['x86', 'i386', 'i686', '386'], arm64: ['arm64', 'aarch64'], arm: ['armv7', 'armhf', 'arm'] , oth:['risc-v', 'riscv', 'powerpc', 'power', 'mips', 'mipsle'] } },
            android: { name: 'Android', keywords: ['android'], arch: { arm64: ['arm64', 'arm64-v8a', 'aarch64'], arm: ['arm', 'armeabi-v7a'], x64: ['x64', 'x86_64', 'amd64'], x86: ['x86'] } },
            ios: { name: 'iOS', keywords: ['ios'], arch: { arm64: ['arm64', 'aarch64'], arm: ['arm'] } },
            other_os: { name: 'Other OS', keywords: ['freebsd', 'netbsd', 'openbsd', 'solaris', 'plan9', 'sunos', 'bsd'] }
        };



export { releasePlatformArchRules };
