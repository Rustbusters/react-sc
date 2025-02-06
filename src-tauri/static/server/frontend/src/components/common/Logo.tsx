import React from 'react'

export const LogoLight = () => <img className="dark:hidden" src={require("../../assets/images/logo-light.svg").default} alt="logo" />
export const LogoDark = () => <img className="hidden dark:block" src={require("../../assets/images/logo-dark.svg").default} alt="logo" />