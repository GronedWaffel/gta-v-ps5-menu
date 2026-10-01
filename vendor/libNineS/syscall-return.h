/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Finish the validated libkernel syscall/JB/RET wrapper before restoring the
 * borrowed thread. Restoring immediately after SYSCALL stalls GTA's streaming
 * on 13.60 even though its general registers compare equal. */
static long
pt_complete_syscall(pid_t pid, pid_t tid, intptr_t gate, const struct reg *saved,
                    struct reg *current, uint64_t return_address) {
  long result = -1;
  int failed = pt_step_lwp(pid,tid) || pt_getregs(tid, current);
  if (!failed && current->r_rip == (uint64_t)gate + 2 &&
      current->r_rsp == saved->r_rsp) {
    int syscall_error = (current->r_rflags & 1) != 0;
    long value = current->r_rax;
    if (syscall_error) {
      // Do not run libc's errno handler in the borrowed thread. The RET at
      // gate+4 was validated before execution; finish through that instead.
      current->r_rip = gate + 4;
      failed = pt_setregs(tid, current);
    } else {
      failed = pt_step_lwp(pid,tid) || pt_getregs(tid, current);
      if (!failed && current->r_rip != (uint64_t)gate + 4) failed = 1;
    }
    if (!failed) failed = pt_step_lwp(pid,tid) || pt_getregs(tid, current);
    if (!failed && current->r_rsp == saved->r_rsp + 8 &&
        current->r_rip == return_address && !syscall_error) result = value;
  }
  if (pt_setregs(tid, saved)) return -1;
  return result;
}
