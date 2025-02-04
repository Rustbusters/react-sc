import React from 'react'

type TitleProps = {
    title: string,
    label: string | null
}

const Title: React.FC<TitleProps> = ({ title, label }) => {
    return (
        <div className="flex flex-col align-middle justify-start space-y-1">
            <h1 className="text-4xl font-bold text-slate-800">{title}</h1>
            <p className="text-md font-regular text-slate-400">{label}</p>
        </div>
    )
}

export default Title;