

function shouldLoadIyuu() {
        return !/^(bangumi\.moe|mikanani\.me|nyaa\.si|acg\.rip)$/i.test(location.hostname)
            && !/(^|\.)(comicat|kisssub)\.org$/i.test(location.hostname);
    }



export { shouldLoadIyuu };
