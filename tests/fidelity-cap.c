#include <assert.h>
#include <stdio.h>
#include "../menu/fidelity-cap.h"
int main(void) {
    FidelityCap s={0}; volatile unsigned interval=2;
    assert(!fidelity_cap_enable(&s,0,1,1,2,&interval)&&interval==2);
    assert(!fidelity_cap_enable(&s,1,0,1,2,&interval)&&interval==2);
    assert(!fidelity_cap_enable(&s,1,1,0,2,&interval)&&interval==2);
    assert(!fidelity_cap_enable(&s,1,1,1,1,&interval)&&interval==2);
    assert(fidelity_cap_enable(&s,1,1,1,2,&interval)&&interval==1&&s.enabled);
    interval=2; fidelity_cap_tick(&s,1,1,2,&interval);assert(interval==1&&s.enabled);
    fidelity_cap_stop(&s,1,2,&interval);assert(interval==2&&!s.enabled);
    assert(fidelity_cap_enable(&s,1,1,1,2,&interval));
    fidelity_cap_tick(&s,0,1,2,&interval);assert(interval==2&&!s.enabled); // Online/menu disabled.
    assert(fidelity_cap_enable(&s,1,1,1,2,&interval));
    fidelity_cap_tick(&s,1,0,1,&interval);assert(interval==1&&!s.enabled); // Performance mode owns 1.
    interval=2;assert(fidelity_cap_enable(&s,1,1,1,2,&interval));
    interval=0;fidelity_cap_stop(&s,1,2,&interval);assert(interval==0&&!s.enabled); // External owner.
    assert(!fidelity_cap_enable(&s,1,1,1,2,&interval)&&interval==0);
    interval=2;assert(fidelity_cap_enable(&s,1,1,1,2,&interval));
    interval=3;fidelity_cap_tick(&s,1,1,2,&interval);assert(interval==3&&!s.enabled);
    puts("Fidelity cap ownership, restoration, mode changes and refusal checks passed");
}
